import json
from sorter import group_by_item

mock_rows = [
    {
      "PO No": "123456",
      "Style No/Ref No": "STYLE-101",
      "Accessory": "Hanger Loop",
      "Dimention": "25 cm",
      "Qty": "100"
    },
    {
      "PO No": "123456",
      "Style No/Ref No": "STYLE-101",
      "Accessory": "H.Loop",
      "Dimention": "30 cm",
      "Qty": "200"
    },
    {
      "PO No": "654321",
      "Style No/Ref No": "STYLE-202",
      "Accessory": "HANGER-LOOP",
      "Dimention": "25 cm",
      "Qty": "150"
    },
    {
      "PO No": "654321",
      "Accessory": "Hanger Loop",
      "Dimention": "",
      "Details": "Length 15x30 here"
    }
]

if __name__ == "__main__":
    result = group_by_item(mock_rows)
    print(json.dumps(result, indent=2))
